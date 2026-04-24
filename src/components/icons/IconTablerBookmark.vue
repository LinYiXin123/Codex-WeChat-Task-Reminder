<script setup lang="ts">
withDefaults(defineProps<{
  filled?: boolean
}>(), {
  filled: false,
})
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
    <path
      :fill="filled ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M7 5a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v16l-5 -3l-5 3z"
    />
  </svg>
</template>
