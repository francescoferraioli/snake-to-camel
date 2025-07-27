interface UserData {
  user_name: string;
  email_address: string;
  phone_number: string;
}

class UserService {
  private user_data: UserData[] = [];

  constructor(
    // Will convert because it doesn't shadow
    private apiClient: any,
    // Will not convert because it shadows an instance method
    private create_user: boolean,
    // Will convert because even though it shadows, it's not an instance field
    getUserCount: boolean
  ) {}

  async getUserById(userId: string): Promise<UserData | null> {
    const userData = this.user_data.find((user) => user.user_name === userId);
    return userData || null;
  }

  async createUser(user_data: UserData): Promise<void> {
    const newUser = {
      ...user_data,
      created_at: new Date(),
    };
    this.user_data.push(newUser);
  }

  getUserCount(): number {
    return this.user_data.length;
  }
}

export { UserService };
