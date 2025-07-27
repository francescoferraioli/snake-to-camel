// Object literal with shorthand properties
const userConfig = {
  user_name: 'test_user',
  email_address: 'test@example.com',
  phone_number: '123-456-7890',
};

// Complex shadowing scenario
const userName = 'global';

export { userConfig, userName };
