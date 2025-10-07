import HttpError from "../helpers/HttpError.js";

// check request
export const validateBody = schema => {
  const func = (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) next(HttpError(400), error.message);
    else next();
  };
  return func;
};
