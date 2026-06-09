const storage = require('../../utils/storage')
const util = require('../../utils/util')
const api = require('../../utils/api')
const logger = require('../../utils/logger')

Page({
  data: {
    bills: [],
    filteredBills: [],
    loading: true,
    filterType: '',
    filterCategory: '',
    filterDate: '',
    categories: [],
    dateRangeText: '全部时间',
    showFilterPanel: false,
    selectedIds: [],
    batchMode: false,
    filterCategoryName: '',
    scope: 'personal',
    hasFamily: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData() {
    const settings = storage.getSettings()
    const hasFamily = !!(settings.familyId)
    const scope = settings.scope || 'personal'

    if (scope === 'family' && hasFamily) {
      this.setData({ loading: true, scope: 'family', hasFamily: true })
      api.getBills({ scope: 'family' })
        .then(data => {
          const bills = data.bills || []
          const cats = storage.getCategories()
          const allCats = [...(cats.expense || []), ...(cats.income || [])]
          this.setData({
            bills: bills,
            filteredBills: bills,
            categories: allCats,
            loading: false,
            selectedIds: []
          }, () => this.applyFilters())
        })
        .catch(() => {
          this.setData({ loading: false })
          util.showToast('加载家庭账单失败')
        })
    } else {
      const bills = storage.getBills()
      const cats = storage.getCategories()
      const allCats = [...(cats.expense || []), ...(cats.income || [])]
      this.setData({
        bills: bills,
        filteredBills: bills,
        categories: allCats,
        loading: false,
        scope: 'personal',
        hasFamily: hasFamily,
        selectedIds: []
      }, () => this.applyFilters())
    }
  },

  applyFilters() {
    let result = [...this.data.bills]
    const { filterType, filterCategory, filterDate } = this.data

    if (filterType) {
      result = result.filter(b => b.type === filterType)
    }
    if (filterCategory) {
      result = result.filter(b => b.category === filterCategory)
    }
    if (filterDate) {
      result = result.filter(b => util.isSameDay(b.date, filterDate))
    }

    this.setData({ filteredBills: result })
  },

  onFilterType(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      filterType: this.data.filterType === val ? '' : val
    }, () => this.applyFilters())
  },

  onFilterCategory(e) {
    const val = e.currentTarget.dataset.value
    const name = e.currentTarget.dataset.name || ''
    this.setData({
      filterCategory: this.data.filterCategory === val ? '' : val,
      filterCategoryName: this.data.filterCategory === val ? '' : name
    }, () => this.applyFilters())
  },

  onFilterDate(e) {
    const val = e.detail && e.detail.value
    if (val) {
      this.setData({ filterDate: val }, () => this.applyFilters())
    }
  },

  clearFilters() {
    this.setData({
      filterType: '', filterCategory: '', filterDate: '',
      filterCategoryName: '', dateRangeText: '全部时间'
    }, () => this.applyFilters())
  },

  toggleFilterPanel() {
    this.setData({ showFilterPanel: !this.data.showFilterPanel })
  },

  onBillClick(e) {
    if (this.data.batchMode) {
      this.toggleSelect(e)
      return
    }
    const bill = e.detail.bill
    util.navigateTo(`/pages/bill-edit/bill-edit?id=${bill.id}`)
  },

  onBillLongPress(e) {
    const bill = e.detail.bill
    this.showBillActions(bill)
  },

  showBillActions(bill) {
    const self = this
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success(res) {
        if (res.tapIndex === 0) {
          util.navigateTo(`/pages/bill-edit/bill-edit?id=${bill.id}`)
        } else if (res.tapIndex === 1) {
          self.confirmDeleteBill(bill)
        }
      }
    })
  },

  confirmDeleteBill(bill) {
    const self = this
    wx.showModal({
      title: '确认删除',
      content: `确定删除这条${bill.type === 'expense' ? '支出' : '收入'}记录吗？`,
      success(res) {
        if (res.confirm) {
          storage.deleteBill(bill.id)
          util.showSuccess('已删除')
          logger.info('删除账单', { billId: bill.id, amount: bill.amount })
          self.loadData()
        }
      }
    })
  },

  toggleSelect(e) {
    const id = e.detail.bill.id
    let selected = [...this.data.selectedIds]
    const idx = selected.indexOf(id)
    if (idx > -1) {
      selected.splice(idx, 1)
    } else {
      selected.push(id)
    }
    this.setData({ selectedIds: selected })
  },

  enterBatchMode() {
    this.setData({ batchMode: true, selectedIds: [] })
  },

  exitBatchMode() {
    this.setData({ batchMode: false, selectedIds: [] })
  },

  onBatchCategory() {
    if (this.data.selectedIds.length === 0) {
      util.showToast('请先选择账单')
      return
    }
    const self = this
    const allCats = this.data.categories
    const catList = allCats.map(c => c.name)
    wx.showActionSheet({
      itemList: catList,
      success(res) {
        const cat = allCats[res.tapIndex]
        if (cat) {
          const bills = storage.getBills()
          const idsSet = new Set(self.data.selectedIds)
          const updatedBills = bills.map(b => 
            idsSet.has(b.id) ? { ...b, category: cat.id, categoryName: cat.name, categoryIcon: cat.icon } : b
          )
          storage.setBills(updatedBills)
          util.showSuccess(`已修改${self.data.selectedIds.length}条账单分类`)
          logger.info('批量修改分类', { count: self.data.selectedIds.length, category: cat.name })
          self.loadData()
          self.exitBatchMode()
        }
      }
    })
  },

  onBatchDelete() {
    if (this.data.selectedIds.length === 0) {
      util.showToast('请先选择账单')
      return
    }
    const self = this
    wx.showModal({
      title: '批量删除',
      content: `确定删除选中的${self.data.selectedIds.length}条账单吗？`,
      success(res) {
        if (res.confirm) {
          const bills = storage.getBills()
          const idsSet = new Set(self.data.selectedIds)
          const updatedBills = bills.filter(b => !idsSet.has(b.id))
          storage.setBills(updatedBills)
          util.showSuccess('已删除')
          logger.info('批量删除账单', { count: self.data.selectedIds.length })
          self.loadData()
          self.exitBatchMode()
        }
      }
    })
  },

  onToggleScope() {
    const newScope = this.data.scope === 'personal' ? 'family' : 'personal'
    storage.updateSetting('scope', newScope)
    this.setData({ scope: newScope })
    this.loadData()
    logger.info('切换账单范围', { scope: newScope })
  },

  onAddBill() {
    util.navigateTo('/pages/bill-edit/bill-edit')
  },

  formatDate(dateStr) {
    return util.formatDate(dateStr)
  }
})
