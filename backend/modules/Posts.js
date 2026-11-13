import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    prompt: { type: String, required: true, trim: true, maxlength: 2048 },
    // Снимката се пази директно в MongoDB (без Cloudinary)
    image: {
      data: { type: Buffer, required: true, select: false },
      contentType: { type: String, default: "image/jpeg" },
      size: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret._id = ret._id.toString();
        delete ret.id;
        delete ret.image;
        return ret;
      },
    },
  }
);

// URL към снимката – фронтендът ползва post.photo както преди
PostSchema.virtual("photo").get(function photoUrl() {
  return `/api/post/${this._id}/image`;
});

PostSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", PostSchema);

export default Post;
