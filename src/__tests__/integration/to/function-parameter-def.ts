export const firstName = 'John';

export const fullName: (firstName: string, lastName: string) => string = (first_name, lastName) => {
  return `${first_name} ${lastName}`;
};
