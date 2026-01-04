export function getUsername(profileUrl) {
  return profileUrl.split("/in/")[1]?.replace("/", "");
}