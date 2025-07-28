export const firstName = 'John';

export const fullName: (first_name: string, last_name: string) => string = (first_name, last_name) => {
  return `${first_name} ${last_name}`;
};
