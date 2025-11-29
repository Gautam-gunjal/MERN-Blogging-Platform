const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },

    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    bio: { type: String, default: '' },

    // social + avatar
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },

    // role: 'user' or 'admin' - default user
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true } // adds createdAt / updatedAt
);

module.exports = mongoose.model('User', UserSchema);
