function processData(user_name: string) {  // This should be skipped due to shadowing
  const emailAddress = 'test@example.com';

  if (user_name.length > 0) {
    const userName = 'shadowed';
    const phoneNumber = '123-456-7890';
  }

  return { user_name, email_address: emailAddress };
}

function processData2(userName: string) {
  const emailAddress = 'test@example.com';

  if (userName.length > 0) {
    const user_name = 'shadowed'; // This should be skipped due to shadowing
    const phoneNumber = '123-456-7890';
  }

  return { user_name: userName, email_address: emailAddress };
}

function test1() {
  const firstName = 'test';
  const lastName = 'test';
  return `${firstName} ${lastName}`;
}

function test2() {
  const firstName = 'test';
  const lastName = 'test';
  return `${firstName} ${lastName}`;
}

class Test {
  test3() {
    const firstName = 'test';
    const lastName = 'test';
    return `${firstName} ${lastName}`;
  }

  test4() {
    const firstName = 'test';
    const lastName = 'test';
    return `${firstName} ${lastName}`;
  }
}

export { processData };
