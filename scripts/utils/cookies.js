const accessCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 min
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

module.exports = { accessCookieOptions, refreshCookieOptions };