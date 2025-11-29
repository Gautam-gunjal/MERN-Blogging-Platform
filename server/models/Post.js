const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
});

/**
 * Post schema
 * - views: number of times the post was viewed (non-negative integer)
 * - helpers added: Post.incrementViews(postId) and post.incViews()
 */
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  categories: [String],

  // keep slug support
  slug: {
    type: String,
    index: true,
    sparse: true,
  },

  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema],

  /** track how many times a post was viewed */
  views: { type: Number, default: 0, min: 0, index: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

/**
 * Ensure updatedAt is set on save
 */
PostSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Static: incrementViews(postId)
 * Performs an atomic increment and returns the updated document.
 * Usage: await Post.incrementViews(postId)
 */
PostSchema.statics.incrementViews = function (postId) {
  return this.findByIdAndUpdate(
    postId,
    { $inc: { views: 1 } },
    { new: true, useFindAndModify: false }
  ).exec();
};

/**
 * Instance: incViews()
 * Increment views on an instance and save it.
 * Usage: await post.incViews();
 */
PostSchema.methods.incViews = function () {
  this.views = Math.max(0, (this.views || 0) + 1);
  return this.save();
};

/**
 * Optional: safeResetViews(count)
 * If you ever need to set views programmatically (e.g. migration), use this.
 */
PostSchema.methods.safeSetViews = function (count = 0) {
  this.views = Math.max(0, parseInt(count, 10) || 0);
  return this.save();
};

/**
 * Index suggestion: already added index on views above; you can add compound indexes as needed.
 * e.g. PostSchema.index({ authorId: 1, createdAt: -1 });
 */

module.exports = mongoose.model('Post', PostSchema);
