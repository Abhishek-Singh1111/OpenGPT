import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
    },
    auth0Sub: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ auth0Sub: 1 }, { unique: true, sparse: true });

// One-to-many relationship: User -> Threads (via Thread.userId)
UserSchema.virtual("threads", {
  ref: "Thread",
  localField: "_id",
  foreignField: "userId",
});

// Cleanup related data if a user is deleted.
UserSchema.pre("findOneAndDelete", async function cleanup(next) {
  try {
    const doc = await this.model.findOne(this.getFilter()).select("_id").lean();
    if (!doc?._id) return next();

    const Thread = mongoose.model("Thread");
    const Session = mongoose.model("Session");

    await Promise.allSettled([
      Thread.deleteMany({ userId: doc._id }),
      Session.deleteMany({ userId: doc._id }),
    ]);

    return next();
  } catch (err) {
    return next(err);
  }
});

export default mongoose.model("User", UserSchema);
