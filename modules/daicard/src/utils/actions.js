export const setWallet = (state, action) => {
  switch (action.type) {
    case "SET_WALLET":
      return [action.text];
    case "SET_ADDRESS":
      console.log('SET_ADDRESS action!' + action.text);
      return [action.text];
    default:
      return state;
  }
};
