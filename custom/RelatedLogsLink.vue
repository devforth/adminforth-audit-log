<template>
  <RouterLink
    v-if="to"
    :to="to"
    class="flex items-center w-full gap-2
           text-left text-sm leading-5
           text-black hover:bg-gray-100
           dark:text-gray-200 dark:hover:bg-gray-700"
  >
    <IconClockSolid
      class="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400"
    />
    <span class="whitespace-nowrap">
      {{ meta?.title || 'Edit History' }}
    </span>
  </RouterLink>
</template>


<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { IconClockSolid } from '@iconify-prerendered/vue-flowbite';

const props = defineProps<{
  record: any;
  meta: any;
  resource: any;
}>();

const route = useRoute(); 

console.log('Current Route Name:', route.name);

const to = computed(() => {
  try {
    const auditResourceId = props.meta?.auditLogResourceId || 'audit_log';
    const resourceColumns = props.meta?.resourceColumns;
    
    if (!resourceColumns) return null;

    const pkName = props.meta?.pkName 
  
    const isShowPage = route.name === 'resource-show' || route.name === 'resource-edit';

    let recordId = props.record?.[pkName];
    
    if (!recordId && isShowPage) {
        recordId = route.params.primaryKey || route.params.id;
    }

    const currentResourceId = props.resource?.resourceId || route.params.resourceId;

    const recordIdCol = resourceColumns.resourceRecordIdColumnName;
    const resourceIdCol = resourceColumns.resourceIdColumnName;
    const createdCol = resourceColumns.resourceCreatedColumnName;

    const query: Record<string, string> = {};

    if (createdCol) {
        query['sort'] = `${createdCol}__desc`;
    }
    if (recordId) {
        query[`filter__${recordIdCol}__eq`] = JSON.stringify(String(recordId));
    }

    if (currentResourceId) {
        query[`filter__${resourceIdCol}__eq`] = JSON.stringify(String(currentResourceId));
    }

    return {
      name: 'resource-list',
      params: { resourceId: auditResourceId },
      query,
    } as any;
  } catch (e) {
    console.error('Error computing RelatedLogsLink to:', e);
    return { name: 'resource-list', params: { resourceId: 'audit_log' } } as any;
  }
});
</script>