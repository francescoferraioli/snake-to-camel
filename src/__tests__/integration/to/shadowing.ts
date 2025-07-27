function processData(user_name: string) {  // This should be skipped due to shadowing
  const emailAddress = 'test@example.com';

  if (user_name.length > 0) {
    const userName = 'shadowed';
    const phoneNumber = '123-456-7890';
  }

  return { user_name, email_address: emailAddress };
}

export { processData };
