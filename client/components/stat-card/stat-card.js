Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    income: {
      type: Number,
      value: 0
    },
    expense: {
      type: Number,
      value: 0
    },
    compact: {
      type: Boolean,
      value: false
    }
  },

  data: {
    displayIncome: '0.00',
    displayExpense: '0.00',
    netAmount: '0.00',
    netClass: ''
  },

  observers: {
    'income,expense': function (income, expense) {
      const inc = Number(income) || 0
      const exp = Number(expense) || 0
      const net = inc - Math.abs(exp)
      this.setData({
        displayIncome: inc.toFixed(2),
        displayExpense: Math.abs(exp).toFixed(2),
        netAmount: (net >= 0 ? '+' : '') + net.toFixed(2),
        netClass: net >= 0 ? 'text-income' : 'text-expense'
      })
    }
  }
})
