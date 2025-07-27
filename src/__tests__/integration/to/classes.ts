interface UserData {
  user_name: string;
  email_address: string;
  phone_number: string;
}

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

export { UserService };
