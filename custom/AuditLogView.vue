<script setup>
import { useCoreStore } from '@/stores/core';
import { computed, ref, watch, defineAsyncComponent, onMounted } from 'vue';

const DiffView = defineAsyncComponent(async () => {
  // pure styles come without tailwind preflight, which would otherwise reset fonts of the whole SPA
  await import("@git-diff-view/vue/styles/diff-view-pure.css");
  const { DiffView } = await import("@git-diff-view/vue");
  return DiffView;
});

const props = defineProps(['column', 'record', 'meta', 'resource', 'adminUser']);
const coreStore = useCoreStore();
const theme = computed(() => coreStore.theme === 'dark' ? 'dark' : 'light');

const { oldRecord, newRecord } = props.record[props.meta.resourceColumns.resourceDataColumnName];
const hasChanges = Object.keys(oldRecord).length > 0 || Object.keys(newRecord).length > 0;

const diffFile = ref();
const diffViewMode = ref();

onMounted(async () => {
  if (!hasChanges) {
    return;
  }
  const { DiffModeEnum } = await import("@git-diff-view/vue");
  const { generateDiffFile } = await import("@git-diff-view/file");
  // the value column of the show view is narrow, so old and new lines go one under another
  diffViewMode.value = DiffModeEnum.Unified;
  const file = generateDiffFile(
    'diff.json',
    JSON.stringify(oldRecord, null, 2),
    'diff.json',
    JSON.stringify(newRecord, null, 2),
    'json',
    'json'
  );
  file.initTheme(theme.value);
  file.init();
  file.buildUnifiedDiffLines();
  diffFile.value = file;
});

watch(theme, (t) => {
  if (!diffFile.value) return;
  diffFile.value.initTheme(t);
  diffFile.value.buildUnifiedDiffLines();
});

</script>

<template>
  <div
    v-if="diffFile"
    class="af-audit-log-diff overflow-hidden rounded-default border border-lightCardBorder dark:border-darkCardBorder"
  >
    <DiffView
      :diff-file="diffFile"
      :diff-view-mode="diffViewMode"
      :diff-view-theme="theme"
      :diff-view-highlight="true"
      :diff-view-wrap="true"
      :diff-view-font-size="13"
    />
  </div>
  <p v-else-if="!hasChanges" class="text-lightShowTableUnderHeadingText dark:text-darkShowTableUnderHeadingText">
    {{ $t('No changes to display') }}
  </p>
</template>

<style>
/* the diff view sets Menlo inline */
.af-audit-log-diff .unified-diff-table-wrapper {
  font-family: theme('fontFamily.mono') !important;
}

.af-audit-log-diff .diff-tailwindcss-wrapper[data-theme="light"] .diff-style-root {
  --diff-border--: theme('colors.lightCardBorder');
  --diff-plain-content--: theme('colors.lightCardBackground');
  --diff-plain-lineNumber--: theme('colors.lightCardBackground');
  --diff-plain-lineNumber-color--: theme('colors.lightInputPlaceholderText');
  --diff-expand-content--: theme('colors.lightCardBackgroundHover');
  --diff-expand-lineNumber--: theme('colors.lightCardBackgroundHover');
  --diff-expand-lineNumber-color--: theme('colors.lightInputPlaceholderText');
  --diff-empty-content--: theme('colors.lightCardBackgroundHover');
  --diff-hunk-content--: theme('colors.lightCardBackgroundHover');
  --diff-hunk-lineNumber--: theme('colors.lightCardBackgroundHover');
  --diff-hunk-lineNumber-hover--: theme('colors.lightPrimary');
  --diff-hunk-content-color--: theme('colors.lightShowTableUnderHeadingText');
  --diff-add-widget--: theme('colors.lightPrimary');
  --diff-add-widget-color--: theme('colors.lightPrimaryContrast');
  --diff-add-content--: theme('colors.lightSuccessSoft');
  --diff-add-lineNumber--: theme('colors.lightSuccessSoft');
  --diff-add-content-highlight--: theme('colors.lightSuccessBorder');
  --diff-del-content--: theme('colors.lightDangerSoft');
  --diff-del-lineNumber--: theme('colors.lightDangerSoft');
  --diff-del-content-highlight--: theme('colors.lightDangerBorder');
  color: theme('colors.lightShowTableBodyText');
}

.af-audit-log-diff .diff-tailwindcss-wrapper[data-theme="dark"] .diff-style-root {
  --diff-border--: theme('colors.darkCardBorder');
  --diff-plain-content--: theme('colors.darkCardBackground');
  --diff-plain-lineNumber--: theme('colors.darkCardBackground');
  --diff-plain-lineNumber-color--: theme('colors.darkInputPlaceholderText');
  --diff-expand-content--: theme('colors.darkCardBackgroundHover');
  --diff-expand-lineNumber--: theme('colors.darkCardBackgroundHover');
  --diff-expand-lineNumber-color--: theme('colors.darkInputPlaceholderText');
  --diff-empty-content--: theme('colors.darkCardBackgroundHover');
  --diff-hunk-content--: theme('colors.darkCardBackgroundHover');
  --diff-hunk-lineNumber--: theme('colors.darkCardBackgroundHover');
  --diff-hunk-lineNumber-hover--: theme('colors.darkPrimary');
  --diff-hunk-content-color--: theme('colors.darkShowTableUnderHeadingText');
  --diff-add-widget--: theme('colors.darkPrimary');
  --diff-add-widget-color--: theme('colors.darkPrimaryContrast');
  --diff-add-content--: theme('colors.darkSuccessSoft');
  --diff-add-lineNumber--: theme('colors.darkSuccessSoft');
  --diff-add-content-highlight--: theme('colors.darkSuccessBorder');
  --diff-del-content--: theme('colors.darkDangerSoft');
  --diff-del-lineNumber--: theme('colors.darkDangerSoft');
  --diff-del-content-highlight--: theme('colors.darkDangerBorder');
  color: theme('colors.darkShowTableBodyText');
}
</style>
