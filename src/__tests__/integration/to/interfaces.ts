interface UserData {
  user_name: string;
  email_address: string;
  phone_number: string;
}

type UserConfig = {
  user_name: string;
  email_address: string;
};

export { UserData, UserConfig };
