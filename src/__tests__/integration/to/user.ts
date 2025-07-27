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

  constructor(private apiClient: any) {}

  async get_user_by_id(userId: string): Promise<UserData | null> {
    const userData = this.user_data.find((user) => user.user_name === userId);
    return userData || null;
  }

  async create_user(user_data: UserData): Promise<void> {
    const newUser = {
      ...user_data,
      created_at: new Date(),
    };
    this.user_data.push(newUser);
  }

  get_user_count(): number {
    return this.user_data.length;
  }
}

function process_user_data(userData: UserData): UserData {
  const processedData = {
    ...userData,
    user_name: userData.user_name.toLowerCase(),
    email_address: userData.email_address.toLowerCase(),
  };
  return processedData;
}

// Complex shadowing scenario
const userName = 'global';

function processData(user_name: string) {
  const emailAddress = 'test@example.com';

  if (user_name.length > 0) {
    const user_name = 'shadowed'; // This should be skipped due to shadowing
    const phoneNumber = '123-456-7890';
  }

  return { user_name, email_address: emailAddress };
}

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

// Destructuring examples
const { user_name: destructuredUser, email_address: destructuredEmail } = {
  user_name: 'john_doe',
  email_address: 'john@example.com',
};

// Function parameters
function validate_user_input(
  user_name: string,
  emailAddress: string
): boolean {
  return user_name.length > 0 && emailAddress.includes('@');
}

// Object literal with shorthand properties
const userConfig = {
  user_name: 'test_user',
  email_address: 'test@example.com',
  phone_number: '123-456-7890',
};

// Shorthand destructuring - should be skipped
const { user_name: displayName, email_address: contactEmail } = {
  user_name: 'jane_doe',
  email_address: 'jane@example.com',
};

export {
  UserService,
  process_user_data,
  validate_user_input,
  userConfig,
  processData,
  DataProcessor,
};
