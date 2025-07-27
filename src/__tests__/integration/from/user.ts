interface UserData {
  user_name: string;
  email_address: string;
  phone_number: string;
}

type UserConfig = {
  user_name: string;
  email_address: string;
};

class UserService {
  private user_data: UserData[] = [];

  constructor(private api_client: any) {}

  async get_user_by_id(user_id: string): Promise<UserData | null> {
    const user_data = this.user_data.find((user) => user.user_name === user_id);
    return user_data || null;
  }

  async create_user(user_data: UserData): Promise<void> {
    const new_user = {
      ...user_data,
      created_at: new Date(),
    };
    this.user_data.push(new_user);
  }

  get_user_count(): number {
    return this.user_data.length;
  }
}

function process_user_data(user_data: UserData): UserData {
  const processed_data = {
    ...user_data,
    user_name: user_data.user_name.toLowerCase(),
    email_address: user_data.email_address.toLowerCase(),
  };
  return processed_data;
}

// Complex shadowing scenario
const user_name = 'global';

function processData(user_name: string) {
  const email_address = 'test@example.com';

  if (user_name.length > 0) {
    const user_name = 'shadowed'; // This should be skipped due to shadowing
    const phone_number = '123-456-7890';
  }

  return { user_name, email_address };
}

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

// Destructuring examples
const { user_name: destructured_user, email_address: destructured_email } = {
  user_name: 'john_doe',
  email_address: 'john@example.com',
};

// Function parameters
function validate_user_input(
  user_name: string,
  email_address: string
): boolean {
  return user_name.length > 0 && email_address.includes('@');
}

// Object literal with shorthand properties
const user_config = {
  user_name: 'test_user',
  email_address: 'test@example.com',
  phone_number: '123-456-7890',
};

// Shorthand destructuring - should be skipped
const { user_name: display_name, email_address: contact_email } = {
  user_name: 'jane_doe',
  email_address: 'jane@example.com',
};

export {
  UserService,
  process_user_data,
  validate_user_input,
  user_config,
  processData,
  DataProcessor,
};
