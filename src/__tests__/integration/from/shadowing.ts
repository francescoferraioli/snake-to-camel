function processData(user_name: string) {  // This should be skipped due to shadowing
  const email_address = 'test@example.com';

  if (user_name.length > 0) {
    const userName = 'shadowed';
    const phone_number = '123-456-7890';
  }

  return { user_name, email_address };
}

function processData2(userName: string) {
  const emailAddress = 'test@example.com';

  if (userName.length > 0) {
    const user_name = 'shadowed'; // This should be skipped due to shadowing
    const phoneNumber = '123-456-7890';
  }

  return { user_name: userName, email_address: emailAddress };
}

export { processData };
