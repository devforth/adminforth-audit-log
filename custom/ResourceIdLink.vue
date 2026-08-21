<template>
  <Link class="font-semibold no-underline" v-if="targetResourceId" :to="`/resource/${targetResourceId}`">
    {{ label }}
  </Link>
  <span v-else-if="label">{{ label }}</span>
  <span v-else class="text-gray-400">-</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@/afcl';
import { useCoreStore } from '@/stores/core';
 
const props = defineProps<{
  column: any;
  record: any;
  meta: any;
  resource: any;
  adminUser: any;
}>();
 
const coreStore = useCoreStore();

const value = computed(() => props.record?.[props.column?.name] ?? null);

// resource might be deleted from config or excluded from the plugin, in this case we render plain text
const targetResourceId = computed(() => {
  if (!value.value) {
    return null;
  }
  const knownFromEnum = (props.column?.enum || []).some((e: any) => e.value === value.value);
  return knownFromEnum || coreStore.resourceById?.[value.value] ? value.value : null;
});

const label = computed(() => {
  if (!value.value) {
    return null;
  }
  return (props.column?.enum || []).find((e: any) => e.value === value.value)?.label
    || coreStore.resourceById?.[value.value]?.label
    || value.value;
});
</script>
