'use strict';

function sendSuccess(res, statusCode, message, data = null, meta = null) {
  const payload = {
    success: true,
    message,
    data
  };

  if (meta !== null && meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

function sendError(res, statusCode, message, code = 'ERROR', details = null) {
  const errorBody = { code };
  if (details !== null && details !== undefined) {
    errorBody.details = details;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error: errorBody
  });
}

module.exports = {
  sendSuccess,
  sendError
};
