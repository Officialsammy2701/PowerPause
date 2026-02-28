const KEY = "pp_session";

export const auth = {
  isAuthed() {
    return localStorage.getItem(KEY) === "1";
  },
  login() {
    localStorage.setItem(KEY, "1");
  },
  logout() {
    localStorage.removeItem(KEY);
  },
};