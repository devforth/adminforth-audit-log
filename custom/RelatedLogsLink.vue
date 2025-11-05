<template>
    <div class="pt-2 flex justify-end">
        <a :href="linkHref" class="text-lightPrimary hover:underline dark:text-darkPrimary break-all ">
          <IconClockSolid class="inline w-4 h-4 me-1 mb-0.5"/>
            Edits History</a>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { IconClockSolid } from '@iconify-prerendered/vue-flowbite';

const props = defineProps<{
  column: any;
  record: any;
  meta: any;
  resource: any;
  adminUser: any;
}>();

const linkHref = computed(() => {
  try {
    const resourceIdCol = props.meta.resourceColumns.resourceIdColumnName;
    const recordIdCol = props.meta.resourceColumns.resourceRecordIdColumnName;

    const auditResourceId = props.meta?.auditLogResourceId || 'audit_log';
    const isAuditLogResource = props.resource?.resourceId === auditResourceId;

    let resourceId: any;
    let recordId: any;
    if (isAuditLogResource) {
      resourceId = props.record?.[resourceIdCol];
      recordId = props.record?.[recordIdCol];
    } else {
      const pkColName = props.resource?.columns?.find((c: any) => c.primaryKey)?.name;
      resourceId = props.resource?.resourceId;
      recordId = pkColName ? props.record?.[pkColName] : undefined;
    }

    const params = new URLSearchParams();
    params.set('sort', `${props.meta.resourceColumns.resourceCreatedColumnName}__desc`);
    if (recordId) params.set(`filter__${recordIdCol}__ilike`, JSON.stringify(String(recordId)));
    if (resourceId) params.set(`filter__${resourceIdCol}__eq`, JSON.stringify(String(resourceId)));

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const adminBase = (props.meta?.ADMIN_BASE_URL || '').toString();
    const basePath = adminBase.replace(/\/$/, '').replace(/^\s+|\s+$/g, '');
    const prefix = basePath ? `${basePath}` : '';
    const path = `${prefix}/resource/${auditResourceId}`.replace(/\/\/+/, '/');
    return `${origin}${path}?${params.toString()}`;
  } catch (e) {
    return '#';
  }
});
</script>

