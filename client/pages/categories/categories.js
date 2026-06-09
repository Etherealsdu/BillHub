const storage = require('../../utils/storage')
const util = require('../../utils/util')

Page({
  data: {
    currentTab: 'expense',
    expenseCategories: [],
    incomeCategories: [],
    showEditModal: false,
    editingCategory: null,
    editName: '',
    showAddModal: false,
    addName: '',
    addType: 'expense'
  },

  onShow() {
    this.loadCategories()
  },

  loadCategories() {
    const cats = storage.getCategories()
    const expense = (cats.expense || []).sort((a, b) => a.sortOrder - b.sortOrder)
    const income = (cats.income || []).sort((a, b) => a.sortOrder - b.sortOrder)
    this.setData({
      expenseCategories: expense,
      incomeCategories: income
    })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  getCurrentCategories() {
    return this.data.currentTab === 'expense'
      ? this.data.expenseCategories
      : this.data.incomeCategories
  },

  onEditCategory(e) {
    const cat = e.currentTarget.dataset.category
    if (cat.isSystem) {
      util.showToast('系统分类不可编辑')
      return
    }
    this.setData({
      showEditModal: true,
      editingCategory: cat,
      editName: cat.name
    })
  },

  onEditNameInput(e) {
    this.setData({ editName: e.detail.value })
  },

  confirmEdit() {
    const name = this.data.editName.trim()
    if (!name) {
      util.showToast('分类名称不能为空')
      return
    }
    const result = storage.updateCategory(this.data.editingCategory.id, { name })
    if (result) {
      util.showSuccess('修改成功')
      this.setData({ showEditModal: false, editingCategory: null })
      this.loadCategories()
    } else {
      util.showError('修改失败')
    }
  },

  cancelEdit() {
    this.setData({ showEditModal: false, editingCategory: null })
  },

  onDeleteCategory(e) {
    const cat = e.currentTarget.dataset.category
    if (cat.isSystem) {
      util.showToast('系统分类不可删除')
      return
    }
    const self = this
    wx.showModal({
      title: '确认删除',
      content: `删除分类"${cat.name}"后，已使用该分类的账单将变为"未分类"，确定删除吗？`,
      success(res) {
        if (res.confirm) {
          const result = storage.deleteCategory(cat.id)
          if (result) {
            const bills = storage.getBills()
            bills.forEach(b => {
              if (b.category === cat.id) {
                storage.updateBill(b.id, { category: '', categoryName: '未分类', categoryIcon: '📦' })
              }
            })
            util.showSuccess('已删除')
            self.loadCategories()
          } else {
            util.showError('删除失败')
          }
        }
      }
    })
  },

  showAddDialog() {
    this.setData({
      showAddModal: true,
      addName: '',
      addType: this.data.currentTab
    })
  },

  onAddNameInput(e) {
    this.setData({ addName: e.detail.value })
  },

  confirmAdd() {
    const name = this.data.addName.trim()
    if (!name) {
      util.showToast('请输入分类名称')
      return
    }
    const type = this.data.addType
    const cats = storage.getCategories()
    const exists = cats[type].some(c => c.name === name)
    if (exists) {
      util.showToast('该分类已存在')
      return
    }
    storage.addCategory({ name, type, icon: '📁' })
    util.showSuccess('添加成功')
    this.setData({ showAddModal: false, addName: '' })
    this.loadCategories()
  },

  cancelAdd() {
    this.setData({ showAddModal: false, addName: '' })
  },

  moveUp(e) {
    const cat = e.currentTarget.dataset.category
    const cats = this.getCurrentCategories()
    const idx = cats.findIndex(c => c.id === cat.id)
    if (idx <= 0) return
    this.swapSortOrder(cats, idx, idx - 1)
  },

  moveDown(e) {
    const cat = e.currentTarget.dataset.category
    const cats = this.getCurrentCategories()
    const idx = cats.findIndex(c => c.id === cat.id)
    if (idx >= cats.length - 1) return
    this.swapSortOrder(cats, idx, idx + 1)
  },

  swapSortOrder(cats, i, j) {
    const allCats = storage.getCategories()
    const type = this.data.currentTab
    const tmpOrder = cats[i].sortOrder
    cats[i].sortOrder = cats[j].sortOrder
    cats[j].sortOrder = tmpOrder
    allCats[type] = cats
    storage.setCategories(allCats)
    this.loadCategories()
  }
})
