/** Zod validation middleware — parsed data lands in req.validatedBody */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const messages = result.error.errors.map(e => e.message);
    return res.status(400).json({ error: messages[0], details: messages });
  }
  req.validatedBody = result.data;
  next();
};

module.exports = { validate };
