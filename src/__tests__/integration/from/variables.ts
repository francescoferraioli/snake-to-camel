// Object literal with shorthand properties
const user_config = {
  user_name: 'test_user',
  email_address: 'test@example.com',
  phone_number: '123-456-7890',
};

// Complex shadowing scenario
const user_name = 'global';

export { user_config, user_name };
