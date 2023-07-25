export interface ICreateCheckInCardRequest {
  userName: string;
  userAvatarUrl: string;
  courseCardName: string;
  classUrl: string;
}

export interface ICreateCheckInCardResponse {
  id: string;
}
