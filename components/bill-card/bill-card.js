Component({
  properties: {
    bill: {
      type: Object,
      value: {}
    },
    showDate: {
      type: Boolean,
      value: true
    },
    showSource: {
      type: Boolean,
      value: true
    }
  },

  data: {
    displayAmount: '',
    amountClass: '',
    sourceText: '',
    sourceClass: '',
    displayTime: ''
  },

  observers: {
    'bill': function (bill) {
      if (!bill || !bill.amount) return
      const isExpense = bill.type === 'expense'
      const absAmount = Math.abs(bill.amount)
      const d = new Date(bill.date)
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      this.setData({
        displayAmount: (isExpense ? '-' : '+') + '¥' + absAmount.toFixed(2),
        amountClass: isExpense ? 'text-expense' : 'text-income',
        sourceText: bill.source === 'wechat' ? '微信' : bill.source === 'alipay' ? '支付宝' : '手动',
        sourceClass: bill.source === 'wechat' ? 'tag-wechat' : bill.source === 'alipay' ? 'tag-alipay' : '',
        displayTime: `${y}-${m}-${day} ${h}:${min}`
      })
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('click', { bill: this.properties.bill })
    },

    onLongPress() {
      this.triggerEvent('longpress', { bill: this.properties.bill })
    }
  }
})
