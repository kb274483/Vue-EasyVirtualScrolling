<template>
  <div style="padding: 24px">
    <h1>virtual-scroll</h1>
    <div style="height: calc(100dvh - 200px); width:50%">
      <VirtualList
        :items="testData"
        :item-size="100"
        :height="'100%'"
        :dynamic="true"
        :useWorker="true"
        key-field="id"
        @scroll="onScroll"
        @item-click="onItemClick"
      >
        <template #default="{ item, index }">
          <div style="height:100%; padding:0 12px; border-bottom:1px solid #eee;">
            #{{ index }}---
            <p>{{ item.text }}</p>
            <img :src="item.img" alt="Image" style="width: 30%; height: 30%; object-fit: cover;">
          </div>
        </template>
      </VirtualList>
    </div>
  </div>
</template>

<script setup>
import { VirtualList } from '../src' 
import { onMounted, ref } from 'vue'

// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let testData = ref([])
onMounted(async () => {
  // await sleep(1000)
  for (let i = 0; i < 10000; i++) {
    testData.value.push({
      text: 'Lorem ipsum '.repeat(Math.floor(Math.random() * 50) + 1),
      id: i,
      img: i % 2 === 0 
        ? 'https://plus.unsplash.com/premium_photo-1677079610974-c2494d4f12b1?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2671' 
        : 'https://images.unsplash.com/photo-1745670993824-0570f723778c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1287'
    })
  }
})

const onScroll = (payload) => {
  console.log('onScroll', payload)
}

const onItemClick = (payload) => {
  console.log('onItemClick', payload)
}

</script>
