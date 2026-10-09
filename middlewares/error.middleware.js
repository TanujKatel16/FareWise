function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}
function errorHandler(error, req, res, next) {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({
    error: status < 500 ? error.message : 'Something went wrong. Please try again.',
  });
}
module.exports = { notFound, errorHandler };
