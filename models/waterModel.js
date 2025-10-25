import { model, Schema } from "mongoose";
import { localDate, localTime } from "../services/waterServices.js";

const waterSchema = new Schema({
  value: {
    type: Number,
    required: true
  },
  date: {
    type: String,
    default: () => localDate()
  },
  time: {
    type: String,
    default: () => localTime()
  },
  owner: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    }
}, {
  versionKey: false,
});


export const Water = model('water', waterSchema)