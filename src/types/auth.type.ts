export interface IGoogleAuth {
  name: {
    givenName: string;
    familyName: string;
  };
  emails: [{ value: string }];
  photos: { value: string }[];
}

export enum PermissionAction {
  MANAGE = 'manage',
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum PermissionSubject {
  ALL = 'all',
  ROLE = 'role',
  PERMISSION = 'permission',
  USER = 'user',
}

export interface ITokenPayload {
  email: string;
  roleId: number;
  id: string;
  permissions: Array<{
    action: PermissionAction;
    object: PermissionSubject;
  }>;
}

export interface IRequestWithUser extends Request {
  user: ITokenPayload;
}

export const UserErrorEnum = {
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
} as const;
export type UserErrorEnum = (typeof UserErrorEnum)[keyof typeof UserErrorEnum];
