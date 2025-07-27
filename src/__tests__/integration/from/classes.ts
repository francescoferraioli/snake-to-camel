interface UserData {
  user_name: string;
  email_address: string;
  phone_number: string;
}

class UserService {
  private user_data: UserData[] = [];

  constructor(
    // Will convert because it doesn't shadow
    private api_client: any,
    // Will not convert because it shadows an instance method
    private create_user: boolean,
    // Will convert because even though it shadows, it's not an instance field
    get_user_count: boolean
  ) {}

  async getUserById(user_id: string): Promise<UserData | null> {
    const user_data = this.user_data.find((user) => user.user_name === user_id);
    return user_data || null;
  }

  async createUser(user_data: UserData): Promise<void> {
    const new_user = {
      ...user_data,
      created_at: new Date(),
    };
    this.user_data.push(new_user);
  }

  getUserCount(): number {
    return this.user_data.length;
  }
}

export { UserService };
