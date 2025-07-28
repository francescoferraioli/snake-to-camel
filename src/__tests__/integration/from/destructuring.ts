// Destructuring examples
const { user_name: destructured_user, email_address: destructured_email } = {
  user_name: 'john_doe',
  email_address: 'john@example.com',
};

// Shorthand destructuring - should be skipped
const { user_name: display_name, email_address: contact_email } = {
  user_name: 'jane_doe',
  email_address: 'jane@example.com',
};

class DataProcessor {
  private user_data: any;

  constructor(user_data: any) {
    this.user_data = user_data;
  }

  process() {
    const { user_name, email_address } = this.user_data;
    return { userName: user_name, emailAddress: email_address };
  }
}

function buildUser(first_name: string, last_name: string): {
  first_name: string;
  last_name: string;
} {
  return { first_name, last_name };
}

const { first_name, last_name } = buildUser('John', 'Doe');

export { destructured_user, destructured_email, display_name, contact_email, DataProcessor };
