interface UserData {
  user_name: string;
  email_address: string;
  phone_number: string;
}

function process_user_data(userData: UserData): UserData {
  const processedData = {
    ...userData,
    user_name: userData.user_name.toLowerCase(),
    email_address: userData.email_address.toLowerCase(),
  };
  return processedData;
}

function validate_user_input(
  userName: string,
  emailAddress: string
): boolean {
  return userName.length > 0 && emailAddress.includes('@');
}

export { process_user_data, validate_user_input };
