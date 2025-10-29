
const { constants } = require('../constant/constant');
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);

  console.error(`[${new Date().toISOString()}] ${err.message}`);

  return process.env.NODE_ENV !== 'production'
    ? (() => {
        switch (statusCode) {
          case constants.VALIDATION_ERROR:
            return res.json({ title: "Validation Failed", message: err.message, stackTrace: err.stack });
          case constants.NOT_FOUND:
            return res.json({ title: "Not Found", message: err.message, stackTrace: err.stack });
          case constants.UNAUTHORIZED_ERROR:
            return res.json({ title: "Unauthorized", message: err.message, stackTrace: err.stack });
          case constants.FORBIDDEN_ERROR:
            return res.json({ title: "Forbidden", message: err.message, stackTrace: err.stack });
          case constants.SERVER_ERROR:
            return res.json({ title: "Server Error", message: err.message, stackTrace: err.stack });
          default:
            return res.json({ title: "Unknown Error", message: err.message, stackTrace: err.stack });
        }
      })()
    : res.json({
        title: "Error",
        message: err.message,
      });
};

module.exports = { errorHandler };
