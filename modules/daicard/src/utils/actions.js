export const setWallet = (state, action) => {
  switch (action.type) {
    case "SET_WALLET":
      return [action.text];
    default:
      return state;
  }
};

export const setAddress = (state, action) => {
  switch (action.type) {
    case "SET_ADDRESS":
      console.log('SET_ADDRESS action!' + action.text);
      return [action.text];
    default:
      return state;
  }
};
