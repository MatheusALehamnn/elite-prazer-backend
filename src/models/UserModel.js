const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "O nome é obrigatório."],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "O email é obrigatório."],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Por favor, forneça um email válido."],
  },
  password: {
    type: String,
    required: [true, "A senha é obrigatória."],
    minlength: [6, "A senha deve ter pelo menos 6 caracteres."],
    select: false, // Não retorna a senha por padrão nas queries
  },
  role: {
    type: String,
    enum: ["client", "companion", "admin"],
    default: "client",
  },
  avatar_url: {
    type: String,
    default: "/default-avatar.png", // Ou um placeholder padrão
  },
  location: {
    type: String,
    trim: true,
  },
  isVerified: {
    type: Boolean,
    default: false, // Para verificação de email, por exemplo
  },
  premium: {
    type: Boolean,
    default: false,
  },
  premiumExpirationDate: {
    type: Date,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // Campos específicos para acompanhantes
  companionProfile: {
    bio: String,
    services: [String],
    priceRange: String, // Ex: "R$100-R$200/hora"
    photos: [String], // URLs das fotos
    videos: [String], // URLs dos vídeos
    availability: String, // Ex: "Seg-Sex, 10h-18h"
    city: String,
    age: Number,
    // Outros campos relevantes para acompanhantes
  },
  // Configurações do usuário
  settings: {
    email_notifications: { type: Boolean, default: true },
    push_notifications: { type: Boolean, default: true },
    profile_visibility: { type: Boolean, default: true }, // Se o perfil é público
    online_status: { type: Boolean, default: true },
    dark_mode: { type: Boolean, default: false },
    language: { type: String, default: "pt-BR" },
  }
}, { timestamps: true });

// Middleware para criptografar a senha antes de salvar
userSchema.pre("save", async function (next) {
  // Só roda esta função se a senha foi modificada (ou é nova)
  if (!this.isModified("password")) return next();

  // Hash da senha com custo de 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// Método para comparar senhas (login)
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
