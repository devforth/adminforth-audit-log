import type {
  AdminForthResource,
  IAdminForth,
  AdminUser,
} from "adminforth";

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js';

import { AdminForthPlugin, AllowedActionsEnum, AdminForthSortDirections, AdminForthDataTypes, HttpExtra, ActionCheckSource,  } from "adminforth";
import { PluginOptions } from "./types.js";

dayjs.extend(utc);

export default class AuditLogPlugin extends AdminForthPlugin {

  options: PluginOptions;
  adminforth: IAdminForth;
  auditLogResource: string;

  constructor(options: PluginOptions) {
    super(options, import.meta.url);
    this.options = options;
  }

  instanceUniqueRepresentation(pluginOptions: any) : string {
    return `single`;
  }

  static defaultError = 'Sorry, you do not have access to this resource.'

  private persistLogRecord = async (
    resourceId: string,
    action: string,
    data: { oldRecord: Object, newRecord: Object },
    user: AdminUser,
    recordId: string | number | null,
    headers?: Record<string, string>
  ) => {
    const record = {
      [this.options.resourceColumns.resourceIdColumnName]: resourceId,
      [this.options.resourceColumns.resourceActionColumnName]: action,
      [this.options.resourceColumns.resourceDataColumnName]: data,
      [this.options.resourceColumns.resourceUserIdColumnName]: user.pk,
      [this.options.resourceColumns.resourceRecordIdColumnName]: recordId,
      [this.options.resourceColumns.resourceCreatedColumnName]: dayjs.utc().format(),
      ...(this.options.resourceColumns.resourceIpColumnName && headers ? { [this.options.resourceColumns.resourceIpColumnName]: this.adminforth.auth.getClientIp(headers) } : {}),
    }

    const auditLogResource = this.adminforth.config.resources.find((r) => r.resourceId === this.auditLogResource);
    await this.adminforth.createResourceRecord({ resource: auditLogResource, record, adminUser: user });
  }

  createLogRecord = async (resource: AdminForthResource, action: AllowedActionsEnum | string, data: Object, user: AdminUser, oldRecord?: Object, extra?: HttpExtra) => {
    const recordIdFieldName = resource.columns.find((c) => c.primaryKey === true)?.name;
    const recordId = data?.[recordIdFieldName] || oldRecord?.[recordIdFieldName];
    const connector = this.adminforth.connectors[resource.dataSource];

    const newRecord = action == AllowedActionsEnum.delete ? {} : (await connector.getRecordByPrimaryKey(resource, recordId)) || {};
    if (action !== AllowedActionsEnum.delete) {
      oldRecord = oldRecord ? JSON.parse(JSON.stringify(oldRecord)) : {};
    } else {
      oldRecord = data
    }

    if (action !== AllowedActionsEnum.delete) {
      const columnsNamesList = resource.columns.map((c) => c.name);
      columnsNamesList.forEach((key) => {
        if (JSON.stringify(oldRecord[key]) == JSON.stringify(newRecord[key])) {
          delete oldRecord[key];
          delete newRecord[key];
        }
      });
    }

    const checks = await Promise.all(
      resource.columns.map(async (c) => {
        if (typeof c.backendOnly === "function") {
          const result = await c.backendOnly({
            adminUser: user,
            resource,
            meta: {},
            source: ActionCheckSource.ShowRequest,
            adminforth: this.adminforth,
          });
          return { col: c, result };
        }
        return { col: c, result: c.backendOnly ?? false };
      })
    );

    const backendOnlyColumns = checks
      .filter(({ result }) => result === true)
      .map(({ col }) => col);

    backendOnlyColumns.forEach((c) => {
      if (JSON.stringify(oldRecord[c.name]) != JSON.stringify(newRecord[c.name])) {
        if (action !== AllowedActionsEnum.delete) {
          newRecord[c.name] = '<hidden value after>'
        }
        if (action !== AllowedActionsEnum.create) {
          oldRecord[c.name] = '<hidden value before>'
        }
      } else {
        delete oldRecord[c.name];
        delete newRecord[c.name];
      }
    });

  /**
   * Create a custom action in the audit log resource
   * @param resourceId - The resourceId of the resource that the action is being performed on. Can be null if the action is not related to a specific resource.
   * @param recordId - The recordId of the record that the action is being performed on. Can be null if the action is not related to a specific record.
   * @param actionId - The id of the action being performed, can be random string
   * @param data - The data to be stored in the audit log
   * @param user - The adminUser user performing the action
   */
    await this.persistLogRecord(
      resource.resourceId,
      action,
      { 'oldRecord': oldRecord || {}, 'newRecord': newRecord },
      user,
      recordId,
      extra?.headers
    );

    return { ok: true };
  }

  logCustomAction = async (params: {
    resourceId: string | null,
    recordId: string | null,
    actionId: string,
    oldData: Object | null,
    data: Object,
    user: AdminUser,
    headers?: Record<string, string>
  }) => {
    const { resourceId, recordId, actionId, oldData, data, user, headers } = params;

     // if type of params is not object, throw error
    if (typeof params !== 'object') {
      throw new Error('params must be an object, please check AdminForth AuditLog custom action documentation')
    }

    if (resourceId) {
      const resource = this.adminforth.config.resources.find((r) => r.resourceId === resourceId);
      if (!resource) {
        const similarResource = this.adminforth.config.resources.find((r) => r.resourceId.includes(resourceId));
        throw new Error(`Resource ${resourceId} not found. Did you mean ${similarResource.resourceId}?`)
      }
    }

    await this.persistLogRecord(
      resourceId,
      actionId,
      { 'oldRecord': oldData || {}, 'newRecord': data },
      user,
      recordId,
      headers
    );
  }


  modifyResourceConfig(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    super.modifyResourceConfig(adminforth, resourceConfig);
    this.adminforth = adminforth;
    const auditLogResourceData = this.adminforth.config.resources.find((r) => r.resourceId === resourceConfig.resourceId);
    const columnToModify = auditLogResourceData.columns.find((c) => c.name === this.options.resourceColumns.resourceIdColumnName);
    this.auditLogResource = resourceConfig.resourceId;
    const existingResources = [];

    this.adminforth.config.resources.forEach((resource) => {

      existingResources.push({ value: resource.resourceId, label: resource.label });
      if (this.options.excludeResourceIds?.includes(resource.resourceId)) {
        return;
      }

      resource.options = resource.options || {} as any;
      if (!resource.options.actions) {
        resource.options.actions = [];
      }

      const historyActionId = 'audit_log_history_btn';
      const alreadyHasAction = resource.options.actions.find((a) => a.id === historyActionId);

      if (!alreadyHasAction) {
        resource.options.actions.push({
          id: historyActionId,
          name: 'History',
          showIn: {
            list: false,
            edit: true,
            show: true,
            showButton: false,
            showThreeDotsMenu: true
          },
          action: async () => ({ ok: true }),
          customComponent: {
            file: this.componentPath('RelatedLogsLink.vue'),
            meta: {
              ...this.options,
              pluginInstanceId: this.pluginInstanceId,
              auditLogResourceId: this.auditLogResource,
              pkName: resource.columns.find((c) => c.primaryKey)?.name || 'id',
              isResourceHistory: false,
              title: 'Edit History'
            }
          }
        });
      }

      if (this.auditLogResource === resource.resourceId) {
        let diffColumn = resource.columns.find((c) => c.name === this.options.resourceColumns.resourceDataColumnName);
        if (!diffColumn) {
          throw new Error(`Column ${this.options.resourceColumns.resourceDataColumnName} not found in ${resource.label}`)
        }
        if (diffColumn.type !== AdminForthDataTypes.JSON) {
          throw new Error(`Column ${this.options.resourceColumns.resourceDataColumnName} must be of type 'json'`)
        }

        diffColumn.showIn = {
          show: true,
          list: false,
          edit: false,
          create: false,
          filter: false,
        };
        diffColumn.components = {
          show: {
            file: this.componentPath('AuditLogView.vue'),
            meta: {
              ...this.options,
              pluginInstanceId: this.pluginInstanceId
            }
          }
        }
      };

      if (resource.resourceId !== this.auditLogResource) {
        resource.hooks.edit.afterSave.push(async ({ resource, updates, adminUser, oldRecord, extra }) => {
          return await this.createLogRecord(resource, 'edit' as AllowedActionsEnum, updates, adminUser, oldRecord, extra)
        });

        resource.hooks.delete.afterSave.push(async ({ resource, record, adminUser, extra }) => {
          return await this.createLogRecord(resource, 'delete' as AllowedActionsEnum, record, adminUser, record, extra)
        });

        resource.hooks.create.afterSave.push(async ({ resource, record, adminUser, extra }) => {
          return await this.createLogRecord(resource, 'create' as AllowedActionsEnum, record, adminUser, undefined, extra)
        });

        resource.options.pageInjections = resource.options.pageInjections || {};
        resource.options.pageInjections.list = resource.options.pageInjections.list || {};

        if (!resource.options.pageInjections.list.threeDotsDropdownItems) {
          resource.options.pageInjections.list.threeDotsDropdownItems = [];
        }

        (resource.options.pageInjections.list.threeDotsDropdownItems as any[]).push({
          file: this.componentPath('RelatedLogsLink.vue'),
          meta: {
            auditLogResourceId: this.auditLogResource,
            resourceColumns: this.options.resourceColumns,
            isResourceHistory: true,
            title: 'Edit History'
          }
        });
      }

    });

    columnToModify.enum = existingResources;
  }
}