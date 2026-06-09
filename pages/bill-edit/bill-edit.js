const storage = require('../../utils/storage')
const util = require('../../utils/util')

Page({
  data: {
    isEdit: false,
    billId: '',
    form: {
      type: 'expense',
      amount: '',
      category: '',
      categoryName: '',
      categoryIcon: '',
      date: '',
      time: '',
      source: 'manual',
      remark: ''
    },
    categories: [],
    expenseCategories: [],
    incomeCategories: [],
    showCategoryPicker: false,
    pickerCategories: [],
    saving: false
  },

  onLoad(options) {
    const cats = storage.getCategories()
    const expenseCats = (cats.expense || []).sort((a, b) => a.sortOrder - b.sortOrder)
    const incomeCats = (cats.income || []).sort((a, b) => a.sortOrder - b.sortOrder)
    const now = new Date()

    this.setData({
      expenseCategories: expenseCats,
      incomeCategories: incomeCats,
      categories: [...expenseCats, ...incomeCats],
      'form.date': util.formatDate(now.toISOString()),
      'form.time': util.formatTime(now.toISOString()),
      'form.category': expenseCats.length > 0 ? expenseCats[0].id : '',
      'form.categoryName': expenseCats.length > 0 ? expenseCats[0].name : '',
      'form.categoryIcon': expenseCats.length > 0 ? (expenseCats[0].icon || '📦') : '📦'
    })

    if (options.id) {
      const bill = storage.getBills().find(b => b.id === options.id)
      if (bill) {
        const d = new Date(bill.date)
        this.setData({
          isEdit: true,
          billId: bill.id,
          'form.type': bill.type,
          'form.amount': String(Math.abs(bill.amount)),
          'form.category': bill.category || '',
          'form.categoryName': bill.categoryName || '',
          'form.categoryIcon': bill.categoryIcon || '📦',
          'form.date': util.formatDate(bill.date),
          'form.time': util.formatTime(bill.date),
          'form.source': bill.source || 'manual',
          'form.remark': bill.remark || ''
        })
      }
    }

    wx.setNavigationBarTitle({
      title: options.id ? '编辑账单' : '记一笔'
    })
  },

  onTypeChange(e) {
    const type = e.currentTarget.dataset.type
    const cats = type === 'expense' ? this.data.expenseCategories : this.data.incomeCategories
    const defaultCat = cats.length > 0 ? cats[0] : { id: '', name: '', icon: '📦' }
    this.setData({
      'form.type': type,
      'form.category': defaultCat.id,
      'form.categoryName': defaultCat.name,
      'form.categoryIcon': defaultCat.icon || '📦'
    })
  },

  onAmountInput(e) {
    let val = e.detail.value
    val = val.replace(/[^\d.]/g, '')
    const dotIdx = val.indexOf('.')
    if (dotIdx > -1 && val.length - dotIdx > 3) {
      val = val.substring(0, dotIdx + 3)
    }
    this.setData({ 'form.amount': val })
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ 'form.time': e.detail.value })
  },

  onSourceChange(e) {
    this.setData({ 'form.source': e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ 'form.remark': e.detail.value })
  },

  openCategoryPicker() {
    const type = this.data.form.type
    const cats = type === 'expense' ? this.data.expenseCategories : this.data.incomeCategories
    this.setData({
      showCategoryPicker: true,
      pickerCategories: cats
    })
  },

  closeCategoryPicker() {
    this.setData({ showCategoryPicker: false })
  },

  selectCategory(e) {
    const cat = e.currentTarget.dataset.category
    this.setData({
      'form.category': cat.id,
      'form.categoryName': cat.name,
      'form.categoryIcon': cat.icon || '📦',
      showCategoryPicker: false
    })
  },

  onSave() {
    if (this.data.saving) return
    const form = this.data.form
    if (!form.amount || parseFloat(form.amount) <= 0) {
      util.showToast('请输入有效金额')
      return
    }
    if (!form.category) {
      util.showToast('请选择分类')
      return
    }
    if (!form.date) {
      util.showToast('请选择日期')
      return
    }

    this.setData({ saving: true })
    const amount = form.type === 'expense'
      ? -Math.abs(parseFloat(form.amount))
      : Math.abs(parseFloat(form.amount))
    const dateStr = `${form.date} ${form.time || '00:00'}`

    const billData = {
      type: form.type,
      amount: amount,
      category: form.category,
      categoryName: form.categoryName,
      categoryIcon: form.categoryIcon,
      date: new Date(dateStr).toISOString(),
      source: form.source,
      remark: form.remark || ''
    }

    if (this.data.isEdit) {
      storage.updateBill(this.data.billId, billData)
      util.showSuccess('修改成功')
    } else {
      storage.addBill(billData)
      util.showSuccess('添加成功')
    }

    setTimeout(() => {
      util.navigateBack()
    }, 300)
  },

  onDelete() {
    const self = this
    wx.showModal({
      title: '删除账单',
      content: '确定删除这条账单吗？',
      success(res) {
        if (res.confirm) {
          storage.deleteBill(self.data.billId)
          util.showSuccess('已删除')
          setTimeout(() => util.navigateBack(), 300)
        }
      }
    })
  }
})
