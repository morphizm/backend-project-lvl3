export const getEncoding = (format) => {
  const utf8 = 'utf-8';
  const base64 = 'base64';
  switch (format) {
    case 'css':
      return utf8;
    case 'js':
      return utf8;
    default:
      return base64;
  }
};

export const c = 1;
