// Destructuring examples
const { user_name: destructuredUser, email_address: destructuredEmail } = {
  user_name: 'john_doe',
  email_address: 'john@example.com',
};

// Shorthand destructuring - should be skipped
const { user_name: displayName, email_address: contactEmail } = {
  user_name: 'jane_doe',
  email_address: 'jane@example.com',
};

class DataProcessor {
  private user_data: any;

  constructor(userData: any) {
    this.user_data = userData;
  }

  process() {
    const { user_name, email_address } = this.user_data;
    return { userName: user_name, emailAddress: email_address };
  }
}

function buildUser(firstName: string, lastName: string): {
  first_name: string;
  last_name: string;
} {
  return { first_name: firstName, last_name: lastName };
}

const { first_name, last_name } = buildUser('John', 'Doe');

export { destructuredUser, destructuredEmail, displayName, contactEmail, DataProcessor };
