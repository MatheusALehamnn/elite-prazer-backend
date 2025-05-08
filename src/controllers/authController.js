const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
// const sendEmail = require("../utils/email"); // Placeholder for email utility

// Helper function to sign JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper function to create and send token in cookie
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
  };

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || "client", // Default to client if not specified
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Por favor, forneça email e senha.",
      });
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: "fail",
        message: "Email ou senha incorretos.",
      });
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

// Placeholder for forgotPassword - to be implemented with email sending
exports.forgotPassword = async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
        status: "fail",
        message: "Não há usuário com este endereço de email."
    });
  }

  // 2) Generate the random reset token
  const resetToken = crypto.randomBytes(32).toString("hex"); // More secure token generation
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email (This part needs an email sending service)
  try {
    const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;
    // await sendEmail({
    //   email: user.email,
    //   subject: "Seu token para reset de senha (válido por 10 min)",
    //   message: `Esqueceu sua senha? Envie uma requisição PATCH com sua nova senha e confirmação para: ${resetURL}.\nSe você não esqueceu sua senha, por favor ignore este email!`,
    // });

    console.log(`Password reset token (for testing): ${resetToken}`); // Log token for testing without email
    console.log(`Password reset URL (for testing): ${resetURL}`);

    res.status(200).json({
      status: "success",
      message: "Token enviado para o email! (Verifique o console para o token de teste)",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
        status: "error",
        message: "Houve um erro ao enviar o email. Tente novamente mais tarde."
    });
  }
};

// Placeholder for resetPassword
exports.resetPassword = async (req, res, next) => {
  try {
    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return res.status(400).json({
          status: "fail",
          message: "Token é inválido ou expirou."
      });
    }
    user.password = req.body.password;
    // user.passwordConfirm = req.body.passwordConfirm; // If you have password confirmation
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    // 3) Log the user in, send JWT
    createSendToken(user, 200, res);

  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
          status: "fail",
          message: "Você não está logado! Por favor, faça login para obter acesso."
      });
    }

    // 2) Verification token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
          status: "fail",
          message: "O usuário pertencente a este token não existe mais."
      });
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt && decoded.iat < Date.parse(currentUser.passwordChangedAt) / 1000) {
        return res.status(401).json({
            status: "fail",
            message: "Usuário recentemente alterou a senha! Por favor, faça login novamente."
        });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    res.locals.user = currentUser; // For use in templates if needed
    next();
  } catch (err) {
     res.status(401).json({
          status: "fail",
          message: "Token inválido ou expirado. Por favor, faça login novamente."
      });
  }
};

// Middleware to restrict access to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ["admin", "lead-guide"]. role="user"
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
          status: "fail",
          message: "Você não tem permissão para realizar esta ação."
      });
    }
    next();
  };
};

