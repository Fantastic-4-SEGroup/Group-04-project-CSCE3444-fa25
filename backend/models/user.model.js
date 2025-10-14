// Placeholder for User model
// In a real app, this would be a Mongoose schema.

const UserSchema = {
  name: 'string',
  email: 'string',
  password: 'string',
  genre_preferences: ['string'],
  parent_account: 'string', // or ObjectId
  children_accounts: ['string'], // or [ObjectId]
};

// Mock data for demonstration
const users = [];

module.exports = { UserSchema, users };
