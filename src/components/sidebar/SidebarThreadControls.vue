<template>
  <div class="sidebar-thread-controls">
    <button
      class="sidebar-thread-controls-button"
      type="button"
      :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="$emit('toggle-sidebar')"
    >
      <IconTablerLayoutSidebarFilled v-if="isSidebarCollapsed" class="sidebar-thread-controls-icon" />
      <IconTablerLayoutSidebar v-else class="sidebar-thread-controls-icon" />
    </button>

    <button
      v-if="showNewThreadButton"
      class="sidebar-thread-controls-button"
      type="button"
      aria-label="新建会话"
      title="新建会话"
      @click="$emit('start-new-thread')"
    >
      <IconTablerFilePencil class="sidebar-thread-controls-icon" />
    </button>

    <slot />
  </div>
</template>

<script setup lang="ts">
import IconTablerFilePencil from '../icons/IconTablerFilePencil.vue'
import IconTablerLayoutSidebar from '../icons/IconTablerLayoutSidebar.vue'
import IconTablerLayoutSidebarFilled from '../icons/IconTablerLayoutSidebarFilled.vue'

defineProps<{
  isSidebarCollapsed: boolean
  showNewThreadButton?: boolean
}>()

defineEmits<{
  'toggle-sidebar': []
  'start-new-thread': []
}>()
</script>

<style scoped>
@reference "tailwindcss";

.sidebar-thread-controls {
  @apply flex flex-row flex-nowrap items-center gap-2;
}

.sidebar-thread-controls-button {
  @apply h-9 w-9 rounded-2xl border border-[#e4dac9] bg-[#fffdf8] text-[#6b6255] flex items-center justify-center transition;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
  box-shadow: 0 8px 18px -22px rgba(31, 41, 55, 0.16);
}

.sidebar-thread-controls-button:hover,
.sidebar-thread-controls-button:focus-visible {
  @apply border-[#cdbfa8] bg-[#f7f1e5] text-[#2d261f];
}

.sidebar-thread-controls-button:active {
  @apply border-[#c7b79b] bg-[#f2eadb] text-[#2d261f];
  box-shadow: inset 0 1px 2px rgba(77, 67, 50, 0.12);
}

.sidebar-thread-controls-icon {
  @apply w-4 h-4;
}
</style>
