interface UserData {
  user_name: string;
  email_address: string;
  phone_number: string;
}

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

export { UserService };
