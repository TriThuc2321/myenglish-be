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
