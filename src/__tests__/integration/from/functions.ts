interface UserData {
  user_name: string;
  email_address: string;
  phone_number: string;
}

function process_user_data(user_data: UserData): UserData {
  const processed_data = {
    ...user_data,
    user_name: user_data.user_name.toLowerCase(),
    email_address: user_data.email_address.toLowerCase(),
  };
  return processed_data;
}

function validate_user_input(
  user_name: string,
  email_address: string
): boolean {
  return user_name.length > 0 && email_address.includes('@');
}

export { process_user_data, validate_user_input };
