import jwt from 'jsonwebtoken';

export function signToken(user, secret) {
  return jwt.sign({ sub: String(user.id), email: user.email }, secret, { expiresIn: '7d' });
}

export function requireAuth(secret) {
  return (req, res, next) => {
    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      req.user = jwt.verify(token, secret);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
