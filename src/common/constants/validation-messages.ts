export const VALIDATION_MESSAGES = {
  // Email validation messages
  EMAIL: {
    NOT_VALID: 'email.not.valid',
    IS_REQUIRED: 'email.is.required',
    TOO_LONG: 'email.too.long',
  },

  // Username validation messages
  USERNAME: {
    IS_REQUIRED: 'username.is.required',
    MUST_BE_STRING: 'username.must.be.string',
    TOO_SHORT: 'username.too.short',
    TOO_LONG: 'username.too.long',
    INVALID_FORMAT: 'username.invalid.format',
  },

  // Password validation messages
  PASSWORD: {
    IS_REQUIRED: 'password.is.required',
    MUST_BE_STRING: 'password.must.be.string',
    TOO_SHORT: 'password.too.short',
    TOO_LONG: 'password.too.long',
    INVALID_FORMAT: 'password.invalid.format',
  },

  // First name validation messages
  FIRST_NAME: {
    MUST_BE_STRING: 'firstName.must.be.string',
    TOO_LONG: 'firstName.too.long',
  },

  // Last name validation messages
  LAST_NAME: {
    MUST_BE_STRING: 'lastName.must.be.string',
    TOO_LONG: 'lastName.too.long',
  },

  // IsActive validation messages
  IS_ACTIVE: {
    MUST_BE_BOOLEAN: 'isActive.must.be.boolean',
  },
} as const;

// Helper function to get nested message keys
export const getValidationMessage = (path: string): string => {
  const keys = path.split('.');
  let result: any = VALIDATION_MESSAGES;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; // Return original path if not found
    }
  }

  return typeof result === 'string' ? result : path;
};
